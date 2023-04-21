import torch
from torch import nn
from torchvision import models
from transformers import DistilBertModel


class FakeNewsDetector(nn.Module):

    def __init__(self, num_classes):
        super(FakeNewsDetector, self).__init__()
        # load DistilBertModel with pre-trained weights from English lower case text corpus
        self.title_module = DistilBertModel.from_pretrained("distilbert-base-uncased")

        # load ResNet50 model with pre-trained weights from ImageNet dataset
        self.image_module = models.resnet50(pretrained="imagenet")
        self.image_module.fc = nn.Identity()

        # dropout layer to prevent overfitting
        self.drop = nn.Dropout(p=0.3)

        self.fc_image = nn.Linear(in_features=2048, out_features=768, bias=True)

        self.fc_classifier = nn.Linear(in_features=768 * 2, out_features=num_classes)

        # Final model prediction via Softmax activation function
        self.softmax = nn.Softmax(dim=1)

    def forward(self, title_input_ids, title_attention_mask, image):
        title_last_hidden_states = self.title_module(
            input_ids=title_input_ids,
            attention_mask=title_attention_mask,
            return_dict=False
        )
        # get the [CLS] token embedding
        title_output = title_last_hidden_states[0][:, 0, :]

        image_output = self.image_module(image)
        image_output = self.fc_image(image_output)

        # concatenate the image and text embeddings
        concat = torch.concat([title_output, image_output], axis=1)
        concat = self.drop(concat)

        logits = self.fc_classifier(concat)

        # apply Softmax activation function to get probabilities
        return self.softmax(logits)
