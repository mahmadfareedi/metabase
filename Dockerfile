###################
# STAGE 1: builder
###################

FROM node:22-bullseye AS builder

ARG MB_EDITION=oss
ARG VERSION
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

WORKDIR /home/node
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates git wget tar gzip; \
    ARCH="$(dpkg --print-architecture)"; \
    case "${ARCH}" in \
      amd64) JDK_ARCH="x64" ;; \
      arm64) JDK_ARCH="aarch64" ;; \
      *) echo "Unsupported architecture: ${ARCH}" >&2; exit 1 ;; \
    esac; \
    JDK_VERSION="21.0.4_7"; \
    JDK_RELEASE="jdk-21.0.4%2B7"; \
    JDK_URL="https://github.com/adoptium/temurin21-binaries/releases/download/${JDK_RELEASE}/OpenJDK21U-jdk_${JDK_ARCH}_linux_hotspot_${JDK_VERSION}.tar.gz"; \
    curl -fsSL "${JDK_URL}" -o /tmp/jdk.tar.gz; \
    mkdir -p /usr/lib/jvm; \
    tar -xzf /tmp/jdk.tar.gz -C /usr/lib/jvm; \
    rm -f /tmp/jdk.tar.gz; \
    JDK_DIR="$(find /usr/lib/jvm -maxdepth 1 -type d -name 'jdk-*' | head -n 1)"; \
    ln -s "${JDK_DIR}" /usr/lib/jvm/temurin-21; \
    update-alternatives --install /usr/bin/java java /usr/lib/jvm/temurin-21/bin/java 1; \
    update-alternatives --install /usr/bin/javac javac /usr/lib/jvm/temurin-21/bin/javac 1; \
    curl -fsSL https://download.clojure.org/install/linux-install-1.12.0.1488.sh -o /tmp/install-clj.sh; \
    chmod +x /tmp/install-clj.sh; \
    /tmp/install-clj.sh; \
    rm -f /tmp/install-clj.sh; \
    rm -rf /var/lib/apt/lists/*

COPY . .

# version is pulled from git, but git doesn't trust the directory due to different owners
RUN git config --global --add safe.directory /home/node

# configure package managers to better tolerate network hiccups
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN yarn config set network-timeout 600000 \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && yarn config set registry https://registry.npmjs.org/

# install frontend dependencies
RUN --mount=type=cache,target=/root/.cache/yarn \
    --mount=type=cache,target=/root/.npm \
    yarn install --frozen-lockfile

# prefetch clojure/tooling dependencies to reduce timeouts during build
RUN --mount=type=cache,target=/root/.m2 \
    clojure -Srepro -Sthreads 8 -P -A:cljs:drivers:build:build/all || true

# build only the necessary steps inside Docker and skip heavy optional ones
ENV SKIP_LICENSES=true
ENV SKIP_TRANSLATIONS=true
RUN --mount=type=cache,target=/root/.m2 \
    --mount=type=cache,target=/root/.cache/yarn \
    --mount=type=cache,target=/root/.npm \
    INTERACTIVE=false CI=true MB_EDITION=$MB_EDITION \
    bin/build.sh '{:version "'"${VERSION}"'", :steps [:version :frontend :drivers :uberjar]}'

# ###################
# # STAGE 2: runner
# ###################

## Remember that this runner image needs to be the same as bin/docker/Dockerfile with the exception that this one grabs the
## jar from the previous stage rather than the local build

FROM eclipse-temurin:21-jre-alpine AS runner

ENV FC_LANG=en-US LC_CTYPE=en_US.UTF-8

# dependencies
RUN apk add -U bash fontconfig curl font-noto font-noto-arabic font-noto-hebrew font-noto-cjk java-cacerts && \
    apk upgrade && \
    rm -rf /var/cache/apk/* && \
    mkdir -p /app/certs && \
    curl https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/certs/rds-combined-ca-bundle.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias aws-rds -file /app/certs/rds-combined-ca-bundle.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    curl https://cacerts.digicert.com/DigiCertGlobalRootG2.crt.pem -o /app/certs/DigiCertGlobalRootG2.crt.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias azure-cert -file /app/certs/DigiCertGlobalRootG2.crt.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    mkdir -p /plugins && chmod a+rwx /plugins

# add Metabase script and uberjar
COPY --from=builder /home/node/target/uberjar/metabase.jar /app/
COPY bin/docker/run_metabase.sh /app/

# expose our default runtime port
EXPOSE 3000

# run it
ENTRYPOINT ["/app/run_metabase.sh"]
