# Rollback Plan (auto) — Summa Social

Generat: 2026-03-26 09:06
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 06ff1050
SHA branca a publicar (main): 98c42354

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 98c42354 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 06ff1050
git push origin prod --force-with-lease
```
