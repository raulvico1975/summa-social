# Rollback Plan (auto) — Summa Social

Generat: 2026-02-16 19:51
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 324ebf7
SHA main a publicar: 99d0113

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 99d0113 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 324ebf7
git push origin prod --force-with-lease
```
