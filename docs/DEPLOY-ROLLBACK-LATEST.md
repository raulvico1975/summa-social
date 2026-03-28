# Rollback Plan (auto) — Summa Social

Generat: 2026-03-28 20:33
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: b57ae7c9
SHA branca a publicar (main): ffc4b3bd

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert ffc4b3bd --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard b57ae7c9
git push origin prod --force-with-lease
```
