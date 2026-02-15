# Rollback Plan (auto) — Summa Social

Generat: 2026-02-15 22:39
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 0a404c8
SHA main a publicar: a280412

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert a280412 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 0a404c8
git push origin prod --force-with-lease
```
