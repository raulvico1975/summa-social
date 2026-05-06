# Rollback Plan (auto) — Summa Social

Generat: 2026-05-06 19:33
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a7dacae54
SHA branca a publicar (main): c71310592

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert c71310592 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a7dacae54
git push origin prod --force-with-lease
```
