# Rollback Plan (auto) — Summa Social

Generat: 2026-07-21 17:23
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 9a1d9c08c
SHA branca a publicar (main): 62df3ef96

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 62df3ef96 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 9a1d9c08c
git push origin prod --force-with-lease
```
