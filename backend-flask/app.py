import requests
from flask import Flask, jsonify, request

import numpy as np

from model import FakeNewsDetector
import torch
from torchvision import transforms
from transformers import DistilBertTokenizer
from flask_cors import CORS, cross_origin

from PIL import Image

app = Flask(__name__)
cors = CORS(app, origins=["http://localhost:3000"],
            methods=["GET", "POST"],
            allow_headers=["Content-Type"])
# app.config['CORS_HEADERS'] = 'Content-Type'


device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = FakeNewsDetector(num_classes=2)
with open('best_epoch_11.pth.tar', 'rb') as f:
    model.load_state_dict(torch.load(f, map_location=device))
model.to(device).eval()

title_tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
image_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.255]
    )
])

# Support ML Inferencing

def transform(img, text):
    encoding = title_tokenizer.encode_plus(
        text,
        max_length=80,
        padding="max_length",
        truncation=True,
        add_special_tokens=True,
        return_token_type_ids=False,
        return_attention_mask=True,
        return_tensors="pt",
    )

    return image_transform(img), encoding['input_ids'], encoding['attention_mask']

# Support Crowdsourcing APIs
def logit(p):
    return np.log((p/(1-p)))
    

def logit_inverse(p):
    return np.exp(p) / (1+np.exp(p))

def clean_prob(prob, epsilon=1e-2):
    if prob == 1:
        prob -= epsilon
    elif prob == 0:
        prob += epsilon

    return prob

def get_correctness(truth, vote):
    # Reward if same as truth, penalize if different
    correctness = 1 if truth == vote else -1
    return correctness

def update_prior_prob(vote, prior_prob, learning_rate = 0.01, epsilon=1e-2):

    prior_prob = clean_prob(prior_prob, epsilon)

    truth = 1 - epsilon

    update_term = vote * logit(truth)
    new_odds = logit(prior_prob) + learning_rate * update_term

    # Do not let prior probability fall below 0.5
    if new_odds < 0:
        new_odds = 0
    
    return logit_inverse(new_odds)

@app.route('/')
def hello():
    return 'Hello World!'

@app.route('/predict', methods=['POST'])
@cross_origin()
def predict():
    data = request.get_json()
    img_url = data["image"]
    text = data["text"]

    img = Image.open(requests.get(img_url, stream=True).raw)
    img, input_ids, attn_mask = transform(img, text)
    if torch.cuda.is_available():
        img = img.cuda()
        input_ids = input_ids.cuda()
        attn_mask = attn_mask.cuda()

    with torch.no_grad():
        model.eval()
        out = model(input_ids, attn_mask, img.unsqueeze(0))
        out = out.flatten()

    return jsonify({'fake': out[0].item(), 'true': out[1].item()})


@app.route('/update-crowdsourcing', methods=['POST'])
@cross_origin()
def update_crowdsource_prob():
    """
    Update crowdsource probability on a rolling basis. Thus recomputation of previous users are not necessary for an update.

    crowdsource_prob: Current displayed probability. Range from [0, 1] (Float)
    user_prob: Current prior probability (trustability) of a user. Range from [0.5, 1] (Float)
    user_vote: Vote of the user. If the user votes for fake news, expect 1. Else 0. (Int)

    return: New crowdsource probability given this user. (Float)
    """

    data = request.get_json()
    crowdsource_prob = clean_prob(data["crowdsource_prob"])
    user_prob = clean_prob(data["user_prob"])
    user_vote = data["user_vote"]
    
    if user_vote == 0:
        user_vote = -1

    return jsonify({'crowdsource_prob': logit_inverse(logit(crowdsource_prob) + user_vote * logit(user_prob))})

@app.route('/update-priors', methods=['POST'])
@cross_origin()
def update_user_prior_probability():
    """
    Update the current priors of users sent to this API. Assumes that an expert opinion / consensus is used for this API and thus their probability of corrrectness is 1.0.
    Assumes a learning rate of 0.01 and an epsilon of 0.01 for correctness. 

    truth: Whether the post is true or false. Expects 1 or 0. (int)
    users_vote: A list of votes for a post sorted by the users ID. Expects a list of 1s of 0s. ([int])
    users_curr_prior: A list of voters' current prior probability. Voters would have voted on the post. Expects a list of [0.5, 1]. 

    return: A list of voters' new prior probability given the correctness of their vote.
    """

    data = request.get_json()
    truth = data["truth"]
    users_vote = data["users_vote"]
    users_curr_prior = data["users_curr_prior"]

    users_vote = [get_correctness(truth, vote) for vote in users_vote]
    users_new_prior = [update_prior_prob(users_vote[idx], prior) for idx, prior in enumerate(users_curr_prior)]

    return jsonify({"users_curr_prior": users_new_prior})


if __name__ == "__main__":
    app.run(port=8000, debug=True)