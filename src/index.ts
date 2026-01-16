import express from 'express';
import cors from 'cors';
import screenSize from './screenSize';
import captureArea from './captureArea';
import capture from './capture';
import captureNewOnly from './captureNewOnly';
import captureFull from './captureFull';
import mousePosition from './mousePosition';
import mouseMove from './mouseMove';
import mouseButton from './mouseButton';
import mouseScroll from './mouseScroll';
import keyPress from './keyPress';
import clipboard from './clipboard';
import shutdown from './shutdown';
import { ensureDataDir } from './state';

const app = express();

app.use(cors());
app.use(express.json());

app.use(screenSize);
app.use(captureArea);
app.use(capture);
app.use(captureNewOnly);
app.use(captureFull);
app.use(mousePosition);
app.use(mouseMove);
app.use(mouseButton);
app.use(mouseScroll);
app.use(keyPress);
app.use(clipboard);
app.use(shutdown);

ensureDataDir();

const PORT = process.env.PORT || 6485;
app.listen(PORT, () => {
  console.log(`Mobile Remote Desktop Server running on port ${PORT}`);
});
