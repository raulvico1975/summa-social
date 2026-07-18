# Rollback Plan (auto) — Summa Social

Generat: 2026-07-18 16:08
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 36f37b9ff
SHA branca a publicar (main): d8e60ad49

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert d8e60ad49 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 36f37b9ff
git push origin prod --force-with-lease
```
