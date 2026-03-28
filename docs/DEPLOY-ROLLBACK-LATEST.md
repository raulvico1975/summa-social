# Rollback Plan (auto) — Summa Social

Generat: 2026-03-28 10:31
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: fc8faa47
SHA branca a publicar (main): ce943242

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ce943242 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard fc8faa47
git push origin prod --force-with-lease
```
