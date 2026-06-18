# Rollback Plan (auto) — Summa Social

Generat: 2026-06-18 16:38
Risc: ALT
Backup curt: SKIPPED_NO_BUCKET
SHA prod abans de publicar: 2bda46cae
SHA branca a publicar (main): d7e5bc9be

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert d7e5bc9be --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 2bda46cae
git push origin prod --force-with-lease
```
