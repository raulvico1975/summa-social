# OPENCLAW MIRROR

OpenClaw és un bot extern que llegeix el codi per acompanyar el projecte.

Necessita un mirror read-only del repo (clon separat, fora del repo de treball).

Ubicació recomanada: `/srv/openclaw/mirror/summa-social` (o equivalent).

Actualització:
```bash
git fetch --all --prune
git reset --hard origin/main
```

Prohibit:
- cap push
- cap secret
- cap deploy des del mirror
