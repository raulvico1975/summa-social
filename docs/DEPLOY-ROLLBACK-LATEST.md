# Rollback Plan (auto) — Summa Social

Generat: 2026-05-07 17:23
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 9e443d239
SHA branca a publicar (main): 6a02253e5

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 6a02253e5 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 9e443d239
git push origin prod --force-with-lease
```
