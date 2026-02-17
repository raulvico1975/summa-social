# Rollback Plan (auto) — Summa Social

Generat: 2026-02-17 07:23
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 645787b
SHA main a publicar: 9ad1ee0

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 9ad1ee0 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 645787b
git push origin prod --force-with-lease
```
