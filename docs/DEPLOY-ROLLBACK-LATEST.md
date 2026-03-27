# Rollback Plan (auto) — Summa Social

Generat: 2026-03-27 08:38
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 0300045d
SHA branca a publicar (main): 4cd8d141

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 4cd8d141 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 0300045d
git push origin prod --force-with-lease
```
