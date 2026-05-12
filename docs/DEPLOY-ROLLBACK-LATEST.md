# Rollback Plan (auto) — Summa Social

Generat: 2026-05-12 22:47
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a40a49027
SHA branca a publicar (main): d970da009

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert d970da009 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a40a49027
git push origin prod --force-with-lease
```
