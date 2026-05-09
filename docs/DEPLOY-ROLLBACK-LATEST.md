# Rollback Plan (auto) — Summa Social

Generat: 2026-05-09 09:42
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 36b585097
SHA branca a publicar (main): a760ace24

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert a760ace24 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 36b585097
git push origin prod --force-with-lease
```
