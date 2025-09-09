import { Route, Routes } from "react-router-dom";
import FileUpload from "./component/FileUpload.js";

function App() {
  return <>
    <Routes>
      <Route path="/" element={<FileUpload />} />
    </Routes>
  </>
}

export default App;
