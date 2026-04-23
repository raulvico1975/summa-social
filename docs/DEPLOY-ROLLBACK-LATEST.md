# Rollback Plan (auto) — Summa Social

Generat: 2026-04-23 08:24
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 724fbed6f
SHA branca a publicar (codex/weekly-product-updates): c8bc26221

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/weekly-product-updates
git revert c8bc26221 --no-edit
git push origin codex/weekly-product-updates
bash scripts/deploy.sh codex/weekly-product-updates
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 724fbed6f
git push origin prod --force-with-lease
```
