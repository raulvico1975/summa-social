# Rollback Plan (auto) — Summa Social

Generat: 2026-03-05 14:41
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 1f84fb9
SHA main a publicar: 2c7123e

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 2c7123e --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 1f84fb9
git push origin prod --force-with-lease
```
