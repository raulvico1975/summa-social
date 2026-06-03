# Rollback Plan (auto) — Summa Social

Generat: 2026-06-03 08:53
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 262e3e2e2
SHA branca a publicar (main): ff42b18b9

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ff42b18b9 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 262e3e2e2
git push origin prod --force-with-lease
```
