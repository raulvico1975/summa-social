# Rollback Plan (auto) — Summa Social

Generat: 2026-04-03 10:20
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 128f4a3b
SHA branca a publicar (main): 93dd87a7

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 93dd87a7 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 128f4a3b
git push origin prod --force-with-lease
```
