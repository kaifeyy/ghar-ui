import sys
from PIL import Image
out=sys.argv[1]; files=sys.argv[2:]
ims=[Image.open(f) for f in files]
cols=2; W=ims[0].width//2; H=int(ims[0].height*W/ims[0].width)
rows=(len(ims)+1)//2
c=Image.new('RGB',(W*cols,H*rows),'white')
for i,im in enumerate(ims): c.paste(im.resize((W,int(im.height*W/im.width))),((i%cols)*W,(i//cols)*H))
c.save(out)
