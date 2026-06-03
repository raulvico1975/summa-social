# Rollback Plan (auto) — Summa Social

Generat: 2026-06-03 14:49
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: c8d3c8ad5
SHA branca a publicar (main): 6428dfd5f

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 6428dfd5f --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard c8d3c8ad5
git push origin prod --force-with-lease
```
