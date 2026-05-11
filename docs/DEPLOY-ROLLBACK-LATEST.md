# Rollback Plan (auto) — Summa Social

Generat: 2026-05-11 18:33
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 65e3fb3d5
SHA branca a publicar (main): e6934fea5

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert e6934fea5 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 65e3fb3d5
git push origin prod --force-with-lease
```
