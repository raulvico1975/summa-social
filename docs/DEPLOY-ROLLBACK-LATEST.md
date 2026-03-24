# Rollback Plan (auto) — Summa Social

Generat: 2026-03-24 11:32
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 45d581db
SHA branca a publicar (main): c4e455f6

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert c4e455f6 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 45d581db
git push origin prod --force-with-lease
```
