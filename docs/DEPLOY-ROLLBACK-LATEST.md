# Rollback Plan (auto) — Summa Social

Generat: 2026-05-15 13:01
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: ea9d9c1ab
SHA branca a publicar (main): 737bcfefc

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 737bcfefc --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ea9d9c1ab
git push origin prod --force-with-lease
```
