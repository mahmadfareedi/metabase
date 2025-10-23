# Runtime deployment (plug-and-play)

This repo includes a pre-packaged way to share your customized Metabase image so others can run it without building.

## Option A — Publish and run from a registry

1. Build and tag locally

```bash
scripts/build-and-package-image.sh yourrepo/metabase-radar:radar-v1 v0.0.1-radar
```

2. Push to your registry

```bash
docker push yourrepo/metabase-radar:radar-v1
```

3. Client runs it

- Edit `docker-compose.runtime.yml` and set the `image:` to `yourrepo/metabase-radar:radar-v1`.
- Then:

```bash
docker compose -f docker-compose.runtime.yml up -d
```

## Option B — Offline tarball (no registry)

1. Build and package (creates a `.tar.gz` image file)

```bash
scripts/build-and-package-image.sh metabase-radar:radar-v1 v0.0.1-radar
```

2. Send the generated tarball (e.g., `metabase-radar-radar-v1.tar.gz`) to your client.

3. Client loads and runs

```bash
docker load -i metabase-radar-radar-v1.tar.gz
docker compose -f docker-compose.runtime.yml up -d
```

Metabase will be available at http://localhost:3000

## Data persistence

The runtime compose mounts `metabase-data:/metabase.db` so the application DB persists between restarts.

## Notes

- If the client needs a different port, change `ports: ["3000:3000"]` to e.g. `"8080:3000"`.
- If the client needs to use a proxy to pull images, configure Docker Desktop proxies or use the tarball flow.

