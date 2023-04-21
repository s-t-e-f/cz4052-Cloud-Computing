import "./report.css";
import Popup from 'reactjs-popup';
import Button from '@mui/material/Button';
import { Box } from "@material-ui/core";
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';

toast.configure();

export default function Report({ post, user, Users, setFakePercentage, setExpert, setReportBool}) {

  const reportHandler = async (reportValue) => {
    if (reportValue === "Real") {
      reportValue = 0;
    } else {
      reportValue=1;
    };
    
    const getCurrentProb = (userId) => {
      return Users.filter(user => user.id===userId)[0].prob;
    } 
    
    // Handle expert vote
    if (user.expert===true) {
      let new_user_prob;
      let payload = JSON.stringify({
        "truth": reportValue,
        "users_vote": post.voters_values,
        "users_curr_prior": post.voters_user.map(getCurrentProb)
      });
      const updateUser = async (update_user) => {
        await axios.post('/getUsers', update_user)
      };
      console.log(payload);
      await axios.post("http://127.0.0.1:8000/update-priors",
                  payload,
                  {
                    headers: { 
                      'Content-Type': 'application/json'
                    }
                  }).then(response => {
                    new_user_prob = response.data.users_curr_prior; 
                    for (let i = 0; i < new_user_prob.length; i++) {
                      let userid = post.voters_user[i];
                      console.log(userid);
                      let new_prob = new_user_prob[i];
                      console.log(new_prob);
                      let update_user = Users.filter(user => user.id===userid)[0];
                      console.log(update_user);
                      update_user.prob = new_prob
                      updateUser(update_user);
                    }
                    toast("User probability updated!", {
                      position: "top-right",
                      autoClose:5000
                    });
                  }).catch(error => {
                    console.log(error);
                  });

      let newPostDetails = post;
      console.log(reportValue); 
      newPostDetails.crowssource_prob = reportValue;
      newPostDetails.expert = true;
      await axios.post('/getUsersByIdLambdaUrl', newPostDetails)
      toast("Post probalibility updated!", {   
        position: "top-right",     
        autoClose: 5000
      });
      setExpert(true);
      setFakePercentage(reportValue);
      return;
    };
  
    // send to update new fake probabaility 
    let payload = JSON.stringify({
      "crowdsource_prob": post.crowssource_prob,
      "user_prob": user.prob,
      "user_vote": reportValue
    });
    let new_prob;
    await axios.post("http://127.0.0.1:8000/update-crowdsourcing",
                    payload,
                    {
                      headers: { 
                        'Content-Type': 'application/json'
                      }
                    }).then(response => {
                      console.log(JSON.stringify(response.data));
                      new_prob = response.data.crowdsource_prob;
                      console.log(new_prob);
                    }).catch(error => {
                      console.log(error);
                    });

      // send to api to update db
      let newPostDetails = post;
      newPostDetails.crowssource_prob = new_prob;
      newPostDetails["voters_user"].push(user.id);
      newPostDetails["voters_values"].push(reportValue);
      // newPostDetails.userCurrentProb.push(user.prob);
      await axios.post('/getUsersByIdLambdaUrl', newPostDetails)
      setFakePercentage(new_prob);  
      toast("Thank you for your contribution!", {
        position: "top-right",
        autoClose: 5000 
      });
      setReportBool(false);
  };

  return (
    <>
       <Popup
              trigger={<Button variant="contained" style={{margin: 5}}> Report </Button>}
              modal
            >
              {close => (
                <div className="modal">
                  <Button 
                    onClick={close}
                    style={{fontsize:18}}
                    >
                    x
                  </Button>
                  <div className="header"> Report the content of this post </div>
                  <Box display='flex' justifyContent='center' alignItems="center">
                    <div>
                    <ToastContainer position="top-right" autoClose={5000}/>
                      <Button 
                      variant="contained" 
                      style={{marginLeft:125, marginTop:10, justifyContent: 'center'}}
                      onClick={() => {
                        reportHandler("Real");
                        close();
                      }}
                      >Real</Button>
                      <ToastContainer position="top-right" autoClose={5000}/>
                    </div>
                    <div>
                      <ToastContainer position="top-right" autoClose={5000}/>
                      <Button 
                      variant="contained" 
                      style={{marginLeft:125, marginTop:10, justifyContent: 'center'}}
                      onClick={() => {
                        reportHandler("Fake");
                        close();
                      }}
                      >Fake</Button>
                    </div>
                </Box>
                  <Box display='flex' justifyContent='flex-end'>
                    <Button
                      onClick={() => {
                        console.log('modal closed');
                        close();
                      }}
                    >
                    Close
                    </Button>
                </Box>
                </div>
              )}
            </Popup>
    </>
  );
}
