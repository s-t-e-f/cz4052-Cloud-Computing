import "./post.css";
import Gradient from 'javascript-color-gradient';
import Button from '@mui/material/Button';
import Report from "../report/Report";
import { Tooltip } from "@material-ui/core";
import axios from "axios";
import { useEffect, useState } from "react";


export default function Post({ post, user, userPost, Users }) {
    
  const like = post.likes;
  const PF = "/assets/";

  const [fakePercentage, setfakePercentage] = useState(post.crowssource_prob);
  const [expertBool, setExpertBool] = useState(post.expert);

  const [reportBool, setReportBool] = useState((user.expert) || ((user.id !== userPost.id) && !expertBool && (post.voters_user.includes(user.id)===false)));
  
  if (post.ml_prob==-1 && post.crowssource_prob==-1) {
    const predictApi = async ( {post} ) => {
      var data = JSON.stringify({
        "image": post.photo,
        "text": post.desc
      });
      console.log(data);
      await axios.post("http://127.0.0.1:8000/predict", 
                          data,
                          {
                            headers: { 
                              'Content-Type': 'application/json'
                            }
                          }).then(response => {
                            console.log(JSON.stringify(response.data));
                            setfakePercentage((response.data.fake));
                          }).catch(error => {
                            console.log(error);
                          });
      // Initialize both the mlprob and crowdsource prob in the database to be the mlprob
      let updatedPost = post;
      updatedPost.ml_prob = fakePercentage;
      updatedPost.crowssource_prob = fakePercentage;
      await axios.post('/getUsersByIdLambdaUrl', updatedPost)
  } 
  predictApi({post});
  } 

  const colorCellFromValue = (value, midpoint = 100) => {    
    const gradientArray = new Gradient()
      .setColorGradient('#0BDA51', 'b3b3cc','#ff6666')
      .setMidpoint(midpoint)
      .getColor(value==0 ? 0.001 : value);
    return gradientArray;
  };



  return (
    <div className="post">
      <div className="postWrapper">
        <div className="postTop">
          <div className="postTopLeft">
              <img
                className="postProfileImg"
                src={
                  userPost.profilePicture
                    ? PF + userPost.profilePicture
                    : PF + "person/noAvatar.png"
                }
                alt=""
              />
            <span className="postUsername">{userPost.username}</span>
          </div>
          <div className="postTopRight">
            {fakePercentage > 0.5 && ~expertBool &&
            <span className="warningText">
              This post is flagged to be fake. 
            </span>
            }
            {
              expertBool &&
              <span className="warningText">
                This post has been verified by an expert.
              </span>
            }
            <Tooltip title="Percentage of this post be to fake">
              {
                fakePercentage != null &&
                <Button 
                variant="contained" 
                style={{backgroundColor: colorCellFromValue(fakePercentage*100)}}
                >{parseFloat(fakePercentage*100).toFixed(2).toString() + "%"}
              </Button>
              }
            </Tooltip>
            {
              reportBool &&
              <Report post={post} user={user} Users={Users} setFakePercentage={setfakePercentage} setExpert={setExpertBool} setReportBool={setReportBool}/>
            }
            {/* <MoreVert />  */}
          </div>
        </div>
        <div className="postCenter">
          <span className="postText">{post?.desc}</span>
          <img className="postImg" src={post.photo} alt="" />
        </div>
        <div className="postBottom">
          <div className="postBottomLeft">
            <img
              className="likeIcon"
              src={`${PF}like.png`}
              alt=""
            />
            <img
              className="likeIcon"
              src={`${PF}heart.png`}
              alt=""
            />
            <span className="postLikeCounter">{like} likes</span>
          </div>
          <div className="postBottomRight">
            <span className="postCommentText">{post.comment} comments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
