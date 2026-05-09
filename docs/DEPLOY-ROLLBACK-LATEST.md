# Rollback Plan (auto) — Summa Social

Generat: 2026-05-09 10:45
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: e34e6978b
SHA branca a publicar (main): 613e43d88

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 613e43d88 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard e34e6978b
git push origin prod --force-with-lease
```
