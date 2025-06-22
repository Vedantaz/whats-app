import multer from 'multer';
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb)=> {
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png'){
        cb(null, true);

    }else{
        cb(new Error("Unsupported file format"), false);
    }
}
const upload = multer({
    storage,
    fileFilter,
    limits : {fileSize:5*1024*1024}
})

export default upload;