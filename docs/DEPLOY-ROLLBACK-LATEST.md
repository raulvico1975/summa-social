# Rollback Plan (auto) — Summa Social

Generat: 2026-04-17 17:44
Risc: ALT
Backup curt: NO_REQUIRED
SHA prod abans de publicar: ef7ca9c80
SHA branca a publicar (codex/blog-cover-publish-prodonly-20260417): a8a6fe18d

## Si cal marxa enrere rapida

Opcio recomanada (preserva historial):
```bash
git checkout codex/blog-cover-publish-prodonly-20260417
git revert a8a6fe18d --no-edit
git push origin codex/blog-cover-publish-prodonly-20260417
bash scripts/deploy.sh codex/blog-cover-publish-prodonly-20260417
```

Emergencia critica (nomes si la produccio cau i no hi ha alternativa):
```bash
git checkout prod
git reset --hard ef7ca9c80
git push origin prod --force-with-lease
```
