# Rollback Plan (auto) — Summa Social

Generat: 2026-06-17 12:56
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: ed0de5be1
SHA branca a publicar (main): 605e70c25

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 605e70c25 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ed0de5be1
git push origin prod --force-with-lease
```
