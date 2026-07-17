# Rollback Plan (auto) — Summa Social

Generat: 2026-07-17 14:29
Risc: MITJA
Backup curt: NO_REQUIRED
SHA prod abans de publicar: 92668c031
SHA branca a publicar (main): 078dcdae3

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout main
git revert 078dcdae3 --no-edit
git push origin main
bash scripts/deploy.sh main
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard 92668c031
git push origin prod --force-with-lease
```
