# Rollback Plan (auto) — Summa Social

Generat: 2026-04-03 09:00
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 46a58657
SHA branca a publicar (main): 56a0d1a0

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 56a0d1a0 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 46a58657
git push origin prod --force-with-lease
```
