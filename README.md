# Bridge Sim

Bridgeグループ（個人のAIプロジェクト群）の状況を、カイロソフト風の経営シミュレーション画面で見える化するアプリ。

- 公開URL: https://yukikanedomi.github.io/bridge-sim/
- ビル断面がグループの現在地: フロア=区分（6F本社／5F連載／4F基幹／3F展示・季節／2F孵化器・倉庫／1F搬入口）、デスクや設備=各プロジェクト、1Fコンベアの荷箱=オートパイロットのキュー
- デスクや荷箱をタップすると詳細ウィンドウに表示

## データについて

`data.js` は private リポジトリ（bridge）の配員表・キューから自動生成される。**手で編集しない**。
生成時に機微情報（時期・家族・非公開案件の内容）はマスク済み。

## 技術

- 依存なしの素の HTML/CSS/JS。ドット絵は低解像度 Canvas（195×300）を整数倍拡大して描画
- フォント: DotGothic16（Google Fonts）
- デプロイ: GitHub Actions → GitHub Pages
