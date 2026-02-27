# Rollback Plan (auto) — Summa Social

Generat: 2026-02-27 15:57
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 71e230b
SHA main a publicar: 9ff9e62

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 9ff9e62 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 71e230b
git push origin prod --force-with-lease
```
