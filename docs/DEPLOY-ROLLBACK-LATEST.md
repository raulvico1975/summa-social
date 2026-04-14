# Rollback Plan (auto) — Summa Social

Generat: 2026-04-14 16:28
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: ed467ca86
SHA branca a publicar (main): 4a9d8315b

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 4a9d8315b --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ed467ca86
git push origin prod --force-with-lease
```
