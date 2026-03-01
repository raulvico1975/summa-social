# Rollback Plan (auto) — Summa Social

Generat: 2026-03-01 19:12
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: bcc0525
SHA main a publicar: fb0f0b2

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert fb0f0b2 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard bcc0525
git push origin prod --force-with-lease
```
