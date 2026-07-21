# Rollback Plan (auto) — Summa Social

Generat: 2026-07-21 17:58
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: ac39eccc3
SHA branca a publicar (main): aacd4a7ef

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert aacd4a7ef --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ac39eccc3
git push origin prod --force-with-lease
```
