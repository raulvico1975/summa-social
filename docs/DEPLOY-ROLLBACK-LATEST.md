# Rollback Plan (auto) — Summa Social

Generat: 2026-07-17 21:54
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: a0fb3554f
SHA branca a publicar (main): 8ee8419fc

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 8ee8419fc --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard a0fb3554f
git push origin prod --force-with-lease
```
