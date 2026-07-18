# Rollback Plan (auto) — Summa Social

Generat: 2026-07-18 21:40
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 4a07f27fc
SHA branca a publicar (main): 9a32dbe32

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 9a32dbe32 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 4a07f27fc
git push origin prod --force-with-lease
```
