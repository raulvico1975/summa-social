# Rollback Plan (auto) — Summa Social

Generat: 2026-03-27 22:19
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 655cba34
SHA branca a publicar (main): c153727a

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert c153727a --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 655cba34
git push origin prod --force-with-lease
```
