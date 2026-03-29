# Rollback Plan (auto) — Summa Social

Generat: 2026-03-29 20:25
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 82608229
SHA branca a publicar (main): 11dc1891

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 11dc1891 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 82608229
git push origin prod --force-with-lease
```
