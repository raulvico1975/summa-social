# Rollback Plan (auto) — Summa Social

Generat: 2026-03-12 13:13
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 3435577
SHA main a publicar: a59ff1b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert a59ff1b --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 3435577
git push origin prod --force-with-lease
```
