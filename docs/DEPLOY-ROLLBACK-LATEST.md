# Rollback Plan (auto) — Summa Social

Generat: 2026-04-06 10:02
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: e83bf2d0
SHA branca a publicar (main): 7d8206c4

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 7d8206c4 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard e83bf2d0
git push origin prod --force-with-lease
```
