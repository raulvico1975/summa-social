# Rollback Plan (auto) — Summa Social

Generat: 2026-03-21 21:55
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: d5f7a95a
SHA main a publicar: 87845410

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 87845410 --no-edit
git push origin main
bash scripts/deploy.sh
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard d5f7a95a
git push origin prod --force-with-lease
```
