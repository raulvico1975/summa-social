# Rollback Plan (auto) — Summa Social

Generat: 2026-05-15 19:04
Risc: BAIX
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 19d2386ac
SHA branca a publicar (main): 136ee7027

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 136ee7027 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 19d2386ac
git push origin prod --force-with-lease
```
