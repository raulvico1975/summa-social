# Rollback Plan (auto) — Summa Social

Generat: 2026-03-26 16:35
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: f5f976f4
SHA branca a publicar (main): 37cc6083

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 37cc6083 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard f5f976f4
git push origin prod --force-with-lease
```
