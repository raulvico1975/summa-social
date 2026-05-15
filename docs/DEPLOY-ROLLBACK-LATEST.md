# Rollback Plan (auto) — Summa Social

Generat: 2026-05-15 19:01
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 8475a8e85
SHA branca a publicar (main): 48750d773

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 48750d773 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 8475a8e85
git push origin prod --force-with-lease
```
