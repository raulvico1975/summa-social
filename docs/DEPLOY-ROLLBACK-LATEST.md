# Rollback Plan (auto) — Summa Social

Generat: 2026-03-28 08:14
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 78ff959a
SHA branca a publicar (main): 67325ad0

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 67325ad0 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 78ff959a
git push origin prod --force-with-lease
```
